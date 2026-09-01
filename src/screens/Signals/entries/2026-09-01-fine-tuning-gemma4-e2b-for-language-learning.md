---
id: '2026-09-01-fine-tuning-gemma4-e2b-for-language-learning'
timestamp: '2026.09.01 // 13:57:10'
title: 'Fine-Tuning Gemma4 E2B for Language Learning'
expanded: false
location: 'San Francisco, US'
---

<figure>
  <img src="/images/signals/2026-09-01-fine-tuning-gemma4-e2b-for-language-learning/alice-in-borderland-full.webp" alt="Screenshot of Oxalis showing a translation and vocabulary breakdown next to a scene from Alice in Borderland with Japanese subtitles" width="2940" height="1678">
  <figcaption>Studying Japanese with Alice in Borderland.</figcaption>
</figure>

The most peculiar side quest I've been on this 4-month career break has been building a language learning app for MacOS with a fully local inference stack called Oxalis.

In this post, we'll go through the following:

- How I fine-tuned Gemma4 E2B to be the only inference engine for Oxalis
- Why fine-tuning wasn't enough
- My thoughts on the state of local inference for consumer apps

## Origin Story

I've been studying Japanese for a while now, and finally reached a point where the most effective method for learning is immersion: consuming real Japanese content.

For immersion learning to be effective, the input needs to be comprehensible. In other words, you cannot just fall asleep every night watching Stein's Gate and expect to become fluent over time. If this were the case, I would have been fluent years ago.

The content you're consuming must be at a level where you can understand with minor assistance. This level is often referred to as "N+1" by the language learning community, which aligns with lingo used by computer and math nerds, probably because the communities themselves overlap quite a bit.

Turning real Japanese content into comprehensible input is annoying with the existing language learning toolchain options. Tools like Migaku are painful to configure, and other more dictionary-style options like Shirabe Jisho are not ergonomic for consuming content. I was bored and had a problem - so into the rabbit hole I went.

> While this article uses Japanese as the main example, I abstracted things for Oxalis in a way where the same principles apply to Chinese, Korean, etc. Once I'm satisfied with my Japanese, I intend to use Oxalis to fix my broken ABC Chinese. Unlike most people in San Francisco, I choose to take things on serially.

## OCR Is All You Need

When it comes to turning real native Japanese content to comprehensible input, OCR might be all you need. Japanese is a language with a lot of homonyms, which means it is common for video media to include burned-in or appended subtitles on screen.

This turns our challenge of making real content into comprehensible input into one simple transformation.

```
┌ input ──────────────────────────────┐
│  frame from a Japanese video        │
└─────────────────┬───────────────────┘
                  │
                  ▼
          [ LLM with vision ]
                  │
                  ▼
┌ output ─────────────────────────────┐
│  translation                        │
│  + vocab word breakdown             │
│  + grammar notes to study from      │
└─────────────────────────────────────┘
```

This is pretty much all you need to build a really efficient vocab generator from a piece of real content. In my first iteration of this project called Blossom, I built a prototype that runs in the browser and executes this by taking a frame from a YouTube video, feeding it into a frontier model in the cloud, and spitting out the study materials.

<figure>
  <img src="/images/signals/2026-08-26-breaking-my-career/blossom-prototype-full.webp" alt="Screenshot of a browser-based Japanese learning tool showing a YouTube video with a translation and vocabulary breakdown panel" width="4710" height="2294">
  <figcaption>An early prototype of Oxalis called Blossom.</figcaption>
</figure>

## Going Loko for Local Models

While the project could have ended here, I opted to instead end the dependency of the app on frontier models. Immersion learning requires thousands of hours of input, and I hated the idea of paying more money to the frontier labs because I was studying more.

Why would I penalize myself for studying?

On top of that, using local models would allow my app to work fully offline, which is great for UX.

Thus, I decided to take on the challenge of making this whole system work with models that could fit and run comfortably on an entry-level Macbook Air. I admittedly underestimated the size of this rabbit hole, but that's what makes this post fun.

### Picking a Model

Converting the app to use local inference was actually the easy part. This was as simple as converting the application into an Electron app and packaging llama.cpp into the bundle and running it as a sidecar. The hard part was speed and quality.

Most local models felt pretty slow. Gemma4 12B fits on a Macbook with 16GB of RAM, but is dense and makes the laptop pretty hot with continued use. Gemma4 26BA4B had decent speed with its MoE architecture, but wouldn't fit on devices with 16GB of RAM. I tried all Gemma and Qwen variants (with and without MTP), but in the end the only model that felt snappy to me and had decent translation was Gemma4 E2B, the weakest and dumbest variant in the Gemma4 lineup.

While Gemma4 E2B is a tiny model (~6GB at q4), it's multimodal and ran decently well on almost every laptop I tested. I decided it would be an interesting challenge to try to make this model into the backbone of Oxalis.

How can we get the highest quality of output from this tiny little model?

## Juicing Quality

In order to evaluate quality in the first place, we need evals. For our native content pipeline this is actually pretty straightforward.

- Was the OCR correct? - deterministic
- Was the kanji to kana correct? - deterministic

The first point is self explanatory. The second point requires some context. Japanese has "Kanji" characters, which do not directly map to a strict phonetic alphabet. Thus, one of the most challenging parts of learning Japanese is memorizing the readings of new words written in Kanji. Getting these readings correct is an important heuristic in assessing quality.

The quality of the translation and vocab definitions are qualitative and would require LLM as a judge. However, I decided to scope both of these criteria out in favor of just the OCR and kanji breakdowns for the following reasons:

- Contextual clues from the native content make it clear to the human whether the translation is bogus or not (product-motivated)
- I'm funding this project myself and don't want to spend money on judgement tokens (resource-motivated)

### Making Evals and Training Data

Given the quality criteria we outlined above, making training data and evals are effectively the same problem: we must generate comprehensible input labels for various frames of native Japanese content using a stronger model that we trust.

I decided to use Kimi K3 as the labeler. To source frames, I created a pipeline that downloads videos, samples frames from the videos, and runs a deterministic image diffing algorithm to prune out duplicate frames.

> The image diffing algorithm essentially takes an image and squashes it into a tiny deterministic fingerprint that encodes the general pattern of light and dark in the image into a short code (imagine gradient patterns). We use a hamming distance threshold to determine a match. This is also useful for ensuring that the dataset contains diverse images generally.

I ran the above pipeline on various input sources and also included some of my own usage data in the mix as well, containing frames representing diverse content like vlogs, blogs, video games, etc. With this, I created a dataset of approximately 6,000 diverse cases.

### Fine-Tuning

I took the training data produced by the above pipeline and fine-tuned Gemma4 E2B using unsloth on a Mac Studio.

> If you're curious, I used LoRA on all matrices with r=32 and alpha=32. I did play with these settings a bit but nothing substantially changed.

Initially, the results did not really make any quantifiably observable improvements. Translations felt more natural, but I was not seeing an increase in OCR accuracy or readings. What gives?

### Product Hacks

I ended up making two changes that would improve the overall output quality of Gemma4 E2B, both with and without fine-tuning.

#### 1. OCR Hint

MacOS comes with native OCR that is quite snappy. I ended up feeding this into the model as an "OCR-hint". This makes a significant difference because it reduces the burden that we put on the language model and changes the task from "extract the most prominent text" to just "clean up the mistakes/noise". This would make a huge difference for OCR accuracy.

#### 2. Sudachi

For Kana reading accuracy, I discovered Sudachi, which is a morphological analyzer for Japanese. In simpler terms, it parses Japanese text and is able to guess readings based on various internal heuristics that depend on the placements of the words.

> This is so freaking cool.

I ended up also running this alongside the model to generate readings deterministically, which means we no longer needed to depend on the model for kana readings.

#### Starting to Cook

The first hack resulted in OCR accuracy doubling for Gemma4 E2B, but it was still unusable as our evals went from 25% to 50%. At this point however, Gemma4 E4B was now usable, and had an OCR success rate of 76%.

> While 76% seems low, the failure mechanisms were not severe and were usually caused by noise before or after the target text from things like street signs in the background of a vlog. E4B at this point was now usable quality-wise, even with no fine-tuning.

### Let's Try This Fine-Tune Again

I then repeated the fine-tuning process, this time providing the OCR hints as part of the training data. The results of this were much better - OCR success rate for E2B went from 50% to 74%.

Despite benchmarking slightly worse than Gemma4 E4B, the snappiness of E2B made it such that it still provides a better user-experience overall with 60%-100% less latency on generation, and less RAM + battery usage. I now use this fine-tuned version everyday when I study Japanese, and named it [Shamrock E2B](https://huggingface.co/oxalis-ink/shamrock-0-e2b).

## Learnings

The first fine-tuning attempt likely failed for a few reasons. The vision encoder and Gemma4 E2B are very small to begin with. Relying on fine-tuning to improve OCR quality across all fonts in the wild and memorize all kana readings is a large ask, especially with a dataset as small as 10,000 rows.

By delegating the kana readings out to a deterministic morphological analyzer, this already removed one large ask. Finally, providing the OCR hint changed the problem space from one of improving transcription resolution to one of cleaning up an already performed transcription. This makes a huge difference, as it significantly reduces the intellectual weight of the task. Now, the model just needs to learn how to use the hints, as opposed to reprogramming its eyes.

> You might be wondering with Apple OCR why an LLM is required now at all. Apple's native OCR picks up any and every piece of text available in the image. A frame from a vlog will pick up all text from the objects visible on screen in addition to the subtitle, when in most cases the target text (the most prominent text) is just the subtitle. An LLM is important here to grab the text we actually want, regardless of whether its carrying the perceptual burden of transcribing the characters or not.

Only after we reduced scope was the fine-tune able to have any consistently positive perceivable impact on the user experience. If I had to sum this up concisely,

```
Fine-tuning is very effective when you narrow the problem down from the product-end.

It is the responsibility of the product engineer to chisel the problem surface to the smallest stochastic space possible, such that fine-tuning can realize its true value.
```

Most product surfaces that rely on frontier models to navigate through a wider output space punt this work, which is fine when you can afford the tokens.

This does create a very interesting opportunity for consumer apps however, which can be resource constrained on tokens due to scale. If you can narrow the problem down enough to the point where a fine-tuned local model will suffice for your use-case, you can distribute an LLM-powered application with just fixed costs.

With LoRA this is especially interesting, as it allows you to load models more efficiently by only loading the base model once and switching adapters. Who says we can't do this on-device as well?

There are still a few more important pieces that I think are missing before local inference becomes a more popular product practice:

- An easy way to ship cross-platform on-device inference (llama.cpp is great, but I think we need something that abstracts mlx as well, and LoRA adapters)
- More strong base models like Gemma4 E2B
- A way to share on-device inference building blocks across multiple apps (we don't want 3 separate apps with 3 copies of the same inference stack)

Perhaps these are the last bits we need for consumer apps to hit the terminal velocity in AI we see with B2B deployments today.

じゃあまた！
