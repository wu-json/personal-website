---
id: '2026-09-08-fine-tuning-qwen3-5-4b-for-japanese-ocr-on-tinker'
timestamp: '2026.09.08 // 10:28:52'
title: 'Fine-Tuning Qwen3.5-4B for Japanese OCR on Tinker'
expanded: false
location: 'San Francisco, US'
---

<figure>
  <img src="/images/signals/2026-09-08-fine-tuning-qwen3-5-4b-for-japanese-ocr-on-tinker/tinker-checkpoints-full.webp" alt="Tinker checkpoints page: eleven checkpoints, 5.7 GB, every row set to never expire" width="1400" height="803">
</figure>

This is how I fine-tuned Qwen3.5-4B with [Tinker](https://tinker.thinkingmachines.ai/) for a product task in my language learning app [Oxalis](https://oxalis.ink/).

If you have not read my blog post [Fine-Tuning Gemma4 E2B for Language Learning](/signals/2026-09-01-fine-tuning-gemma4-e2b-for-language-learning), please do that first. It provides some context that is not in this writeup.

One of the downsides of using Unsloth to fine-tune Gemma4 locally that I didn't talk about as much in my last post is speed. Each fine-tune takes a couple of days. Fine-tuning the model takes time, generating a corpus to train an MTP drafter takes time, and running the evals also takes time, especially when all of this is happening on one consumer-spec'ed machine.

I'm an impatient guy. I wanted to explore platforms that abstracted training and inference infra away in hopes of one day moving this workflow off of my Mac Studio. I've heard great things about Tinker, and wanted to give it a try after a new friend blessed me with some credits (thanks [Simon](https://simonguo.tech/)).

This writeup walks through my experience fine-tuning with Tinker. For context, I'm a full stack engineer that has worked with product and infra. However, I have little to no ML Engineering background. Most of the concepts I've learned about in ML are things I've picked up in the last few weeks. This means two things:

1. Please excuse any "trivial" mistakes in this writeup.
2. I have an interesting perspective: does Tinker make it easy for a beginner with a coding agent to fine-tune?

Let's find out.

## Background

First let's align on what the task is.

> Given an image with Japanese text on it, identify the most prominent text, transcribe it, and break it down into vocab words.

<figure>
  <img src="/images/signals/2026-09-08-fine-tuning-qwen3-5-4b-for-japanese-ocr-on-tinker/eval-fixture-full.webp" alt="A speaker at an art festival with a Japanese subtitle along the bottom of the frame" width="960" height="476">
  <figcaption>One of the 425 eval fixtures: Note how there is noisy text on the wall in the background.</figcaption>
</figure>

Every fixture in our evaluation suite stores a small answer key. Only two fields are graded: the source text, and its reading in kana.

```json
{
  "originalText": "実は液体のもので香りを作っているんですけど",
  "reading": "じつはえきたいのものでかおりをつくっているんですけど"
}
```

In the product, the model has to return the full payload the app renders: the source text, a translation, a word-by-word breakdown with readings, and grammar notes. For this frame a perfect answer looks like this:

```json
{
  "originalText": "実は液体のもので香りを作っているんですけど",
  "translation": "Actually, we make the scent with a liquid, but...",
  "breakdown": [
    { "word": "実は", "reading": "じつは", "meaning": "actually; in fact", "partOfSpeech": "adverb" },
    { "word": "液体", "reading": "えきたい", "meaning": "liquid", "partOfSpeech": "noun" },
    { "word": "の", "reading": "の", "meaning": "attributive particle", "partOfSpeech": "particle" },
    ...
  ],
  "grammarNotes": "〜んですけど adds an explanatory, softening tone; で marks the means (\"with a liquid\")."
}
```

<figure>
  <img src="/images/signals/2026-09-01-fine-tuning-gemma4-e2b-for-language-learning/alice-in-borderland-full.webp" alt="Oxalis showing a translation and vocabulary breakdown next to a scene from Alice in Borderland with Japanese subtitles" width="2310" height="1296">
  <figcaption>An example of the Oxalis UI built from a payload like this one.</figcaption>
</figure>

Grading compares `originalText` to the answer by character error rate, then concatenates the breakdown's `word` fields and checks them against the source text, and its `reading` fields against the kana. Translation, meanings and grammar notes are not scored.

In the actual Oxalis app, we also provide Apple's Vision OCR transcription as a hint. The backstory behind this is also explained in the [Fine-Tuning Gemma4 E2B](/signals/2026-09-01-fine-tuning-gemma4-e2b-for-language-learning) blog post. It essentially helps smaller models with poor vision by turning the transcription task into a cleaning task.

<figure>
<pre><code>、AREA.
130m
（ART）
MI
AA
RT FES
実は液体のもので香りを作っているんですけど</code></pre>
  <figcaption>Apple Vision OCR hint. Note how noisy it is: everything above the last line is stray signage from the background.</figcaption>
</figure>

Here is an example of a full request the Oxalis app makes to llama.cpp for this feature.

```json
{
  "system": "You are a language learning assistant helping users understand foreign-language text. ...",
  "user": [
    {
      "image": "..."
    },
    {
      "text": "Please analyze this image and translate the most prominent Japanese text you see."
    },
    {
      "text": "On-device OCR of the image (a hint — may have misread characters or picked up stray text from background elements). Use it to read the Japanese text you can't make out, but defer to the image: ignore irrelevant background text and silently clean it up.\n\n、AREA.\n130m\n（ART）\nMI\nAA\nRT FES\n実は液体のもので香りを作っているんですけど"
    }
  ]
}
```

**We'll be fine-tuning Qwen3.5-4B on Tinker for this OCR task.**

In an ideal world, this blog post would be about moving my Gemma4 E2B training pipeline to Tinker, but Tinker does not support Gemma4 models at this time.

Despite being slower than Gemma4 E2B, Qwen3.5-4B is comparable in size and also runs on consumer hardware.

## Methods

1. **Grader.** A Python port of the Japanese OCR eval harness I built for Oxalis. It sends each fixture to the model five times, scores each JSON reply against the answer, and takes the median. It reproduces the harness's existing evals exactly.
2. **Baseline.** The untouched `Qwen/Qwen3.5-4B` sampled through Tinker inference: 425 cases × 5 samples × 2 arms (with/without OCR hint).
3. **Training data.** The Japanese OCR subset of the data I used to fine-tune Gemma4 for Oxalis: 2,606 image rows, 150 held out for a loss check. About 4.4k tokens per row, 2,040 of them image tokens, with only the ~240-token JSON answer supervised.
4. **Training.** The same recipe as the Gemma4 fine-tune Oxalis ships, unchanged: LoRA rank 32, lr 2e-4 linear, 1 epoch, batch 4, a checkpoint at each quarter. 613 steps, 43 minutes.
5. **Grading.** Twelve checkpoints on all 425 cases would have been twelve full passes, so every checkpoint was first graded on a fixed 100-case subset to rank them cheaply, then only the subset's top scorer (the half-way checkpoint) and the final checkpoint went through all 425; the final one won.

## Results

These are the results of one epoch of LoRA on 2,456 training rows, graded on 425 Japanese OCR eval fixtures before and after.

| Metric                                       | Before (base) | After (LoRA) | Change |
| -------------------------------------------- | ------------: | -----------: | -----: |
| Aggregate score, image only                  |         0.733 |    **0.854** | +0.121 |
| Aggregate score, image + OCR hint            |         0.756 |    **0.887** | +0.131 |
| Cases read exactly right, of 425 (with hint) |           286 |      **366** |    +80 |
| Source text accuracy, 1 − CER (with hint)    |         0.840 |    **0.968** | +0.128 |

> **Aggregate** is the eval harness's weighted score: exact and near-exact reading of the Japanese text, plus how well the word-by-word breakdown and readings match the gold. **OCR hint** is the production path described previously, where the prompt also carries Apple Vision's OCR of the frame; "image only" is the model's own reading with no hint.

### Gemma4 E2B vs Qwen3.5-4B

| Model      | Base (with hint) | Fine-tuned (with hint) | Lift |
| ---------- | ---------------: | ---------------------: | ---: |
| Gemma4 E2B |              50% |                **74%** |  +24 |
| Qwen3.5-4B |              67% |                **86%** |  +19 |

Overall, we end up with a fine-tune that performs better than the Gemma4 E2B fine-tune I trained locally. This makes sense since the Qwen3.5-4B base model without tuning outperforms Gemma4 E2B to begin with.

This is something I was aware of before this experiment. Qwen3.5 models have great vision and can handle more tricky cases than Gemma4 E2B. However, I opted for E2B for the production application because it feels more performant due to having 2B effective parameters, as opposed to Qwen3.5's dense 4B parameters.

In addition, Gemma4 models appeared to have a better understanding of the Japanese language when queried on unstructured questions like grammar patterns, which is harder to quantify.

### Before and After

```chart
{
  "type": "dumbbell",
  "from": "base",
  "to": "tuned, final checkpoint",
  "note": "all 425 cases",
  "domain": [0.5, 1.0],
  "ticks": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  "rows": [
    { "label": "aggregate", "group": "bare", "from": 0.7327, "to": 0.8536 },
    { "label": "aggregate", "group": "hint", "from": 0.7555, "to": 0.8875 },
    { "label": "exact OCR rate", "group": "bare", "from": 0.6282, "to": 0.7765 },
    { "label": "exact OCR rate", "group": "hint", "from": 0.6729, "to": 0.8612 },
    { "label": "source CER", "group": "bare", "from": 0.8272, "to": 0.9563 },
    { "label": "source CER", "group": "hint", "from": 0.8397, "to": 0.9676 },
    { "label": "breakdown text", "group": "bare", "from": 0.8265, "to": 0.9541 },
    { "label": "breakdown text", "group": "hint", "from": 0.8372, "to": 0.962 },
    { "label": "breakdown readings", "group": "bare", "from": 0.6871, "to": 0.7452 },
    { "label": "breakdown readings", "group": "hint", "from": 0.7001, "to": 0.7496 }
  ],
  "caption": "One row per metric and arm. Readings (bd.kana) move least: Tinker trains only the language side, the vision tower stays frozen."
}
```

### Training Curve

```chart
{
  "type": "line",
  "x": { "domain": [0, 613], "ticks": [0, 154, 308, 462, 613] },
  "y": { "domain": [0.3, 0.8], "ticks": [0.3, 0.4, 0.5, 0.6, 0.7, 0.8] },
  "series": [
    {
      "label": "train NLL, 10-step mean",
      "tone": "ink",
      "points": [
        [9, 0.648], [19, 0.524], [29, 0.488], [39, 0.49], [49, 0.517], [59, 0.447],
        [69, 0.476], [79, 0.465], [89, 0.481], [99, 0.498], [109, 0.482], [119, 0.464],
        [129, 0.44], [139, 0.434], [149, 0.501], [159, 0.44], [169, 0.434], [179, 0.424],
        [189, 0.425], [199, 0.443], [209, 0.381], [219, 0.407], [229, 0.428], [239, 0.417],
        [249, 0.389], [259, 0.423], [269, 0.413], [279, 0.385], [289, 0.413], [299, 0.448],
        [309, 0.414], [319, 0.367], [329, 0.382], [339, 0.385], [349, 0.437], [359, 0.394],
        [369, 0.407], [379, 0.397], [389, 0.398], [399, 0.369], [409, 0.388], [419, 0.415],
        [429, 0.404], [439, 0.339], [449, 0.366], [459, 0.419], [469, 0.375], [479, 0.36],
        [489, 0.385], [499, 0.35], [509, 0.363], [519, 0.374], [529, 0.357], [539, 0.415],
        [549, 0.362], [559, 0.369], [569, 0.368], [579, 0.386], [589, 0.395], [599, 0.352],
        [609, 0.337], [612, 0.378]
      ]
    },
    {
      "label": "held-out NLL, 150 rows",
      "tone": "faint",
      "dash": true,
      "markers": "hollow",
      "annotate": true,
      "points": [[0, 0.7472], [154, 0.4456], [308, 0.4119], [462, 0.3934]]
    }
  ],
  "caption": "Loss on the response tokens only, by optimizer step. Held-out NLL keeps falling to the last quarter; the product metric below flattens earlier."
}
```

### Checkpoints on the Product Metric

```chart
{
  "type": "line",
  "x": {
    "domain": [0, 613],
    "ticks": [0, 154, 308, 462, 613],
    "labels": ["base", "q25", "q50", "q75", "final"]
  },
  "y": { "domain": [0.6, 0.95], "ticks": [0.6, 0.7, 0.8, 0.9] },
  "series": [
    {
      "label": "hint arm",
      "tone": "ink",
      "markers": "solid",
      "points": [[0, 0.6815], [154, 0.8896], [308, 0.8935], [462, 0.892], [613, 0.8852]]
    },
    {
      "label": "bare arm",
      "tone": "faint",
      "markers": "solid",
      "points": [[0, 0.6639], [154, 0.8465], [308, 0.8554], [462, 0.8522], [613, 0.8491]]
    }
  ],
  "caption": "Aggregate score per checkpoint on the fixed 100-case subset, both arms. Most of the gain is in by the first quarter. The full 425-case numbers for the half-way and final checkpoints are in the results table above; on the full set, final beats the half-way checkpoint by about 0.02."
}
```

### Time and Cost

| Step                                                                                            |  Wall-clock | Cost (list) |
| ----------------------------------------------------------------------------------------------- | ----------: | ----------: |
| Base graded, both arms                                                                          |      32 min |        ≈ $5 |
| Toy and smoke runs (a few steps on a handful of rows, to exercise the loop before the real run) |       5 min |       cents |
| Training, 613 steps + 4 held-out evals                                                          |      43 min |       ≈ $10 |
| Subset grading, 4 checkpoints × 2 arms                                                          |      30 min |        ≈ $2 |
| Full grading, 2 checkpoints × 2 arms                                                            |      51 min |        ≈ $5 |
| **Total**                                                                                       | **≈ 2.7 h** |   **≈ $22** |

> 89% of prefill tokens came from Tinker's prompt cache at the 80% discount, and the tuned model answers in 2.6× fewer tokens than the base.

## Feedback

- **Say what can be tuned on the model page:** On Tinker, the vision tower and projector of Qwen3.5-4B do not appear to be tunable. This is okay, but I wish this was more clear from the start. I didn't realize this until after inspecting the adapter from the toy run, as vision and projector entries were missing. I think the tunable components of each model should be explicitly listed on the [Tinker model page](https://tinker-docs.thinkingmachines.ai/tinker/models/), so that people don't have to come to this realization mid-experiment.

  In our case, being able to tune vision would be great, as it would enable us to train the model to correct small mistakes in the Apple OCR hint, since that requires the model to actually see the delta. This is something I am able to do with Gemma4 in unsloth.

- **Checkpoints and sessions pile up with no expiry or tags:** When using Tinker with a coding agent, checkpoint cleanliness is not enforced by anything. With Fable driving this experiment, I ended up with 11 never-expiring checkpoints and a bunch of untagged sessions. The cookbook trainer sets periodic checkpoints with expiry, but my agent didn't get the memo. An example skill on cleanliness best practices, and a nudge toward expiry and metadata at save time, would help here.

- **Show cost per session in the UI:** I would like to see billing per session in the Tinker UI at the top level of the sessions list and in the session details page. This along with guidance for coding agents to tag sessions/checkpoints would make confidence in budget and billing a lot higher. For example, while training Qwen3.5-4B, I had some sessions that just ran my eval suite with Tinker inference. Seeing an "eval" tag along with a cost that I've grown used to from running the suite would make identifying the session very easy for me. Furthermore, it would give me an idea of how much running my eval suite actually costs when I budget for my next run.

- **Add Gemma:** In my experience, the Gemma4 family has much better generalized knowledge compared to Qwen3.5, which is the only comparable class that also runs tolerably on consumer devices. Gemma4 E2B and E4B support would make fine-tuning models for local inference much easier for people without beefy hardware.

- **Timestamps are localized, nothing else is:** Small UI nit, but it appears that timestamps are device language localized while other text isn't.

  <figure>
    <img src="/images/signals/2026-09-08-fine-tuning-qwen3-5-4b-for-japanese-ocr-on-tinker/tinker-sessions-full.webp" alt="Tinker sessions list with the Created column showing a Japanese relative timestamp, circled, next to English labels" width="1400" height="268">
  </figure>

## Final Thoughts

Tinker's SDK-first approach is excellent. I ran this experiment in a few hours, with almost all of it driven by a coding agent. Keeping infrastructure out of the training loop makes recipe code much easier to read, and much more approachable for a beginner like me.

I'm looking forward to a future where more engineers feel empowered to reach for fine-tuning as one more spanner in the box.

In terms of where Tinker could go in the future, I think it would be extremely interesting if Tinker completely owns the improvement loop for a model.

Imagine Tinker accepting customer datums through a webhook, training an increment on top of the current adapter, gating the new version behind evals and safety checks, and promoting the checkpoint once it passes. This would effectively automate what I do with Oxalis's Shamrock model today. The primitives that comprise Tinker are designed in a way where this should be possible in the future.
