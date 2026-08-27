---
id: '2026-08-26-breaking-my-career'
timestamp: '2026.08.26 // 18:52:47'
title: 'Breaking My Career'
expanded: false
location: 'San Francisco, US'
---

<figure>
  <img src="/images/signals/2026-08-26-breaking-my-career/DSCF3858-full.webp" alt="Black-and-white photo of a man in glasses working at a cluttered desk covered in papers" width="4992" height="3328">
  <figcaption>I saw this photo in a museum in Shanghai. I forgot the context.</figcaption>
</figure>

Today marks month four of the first and only break in my entire software engineering career. I've been working remotely for tech startups ever since COVID hit during my sophomore year of college. These companies spanned across many industries ranging from finance and e-commerce all the way to restaurant tech.

In March of last year, I moved out to San Francisco for my first in-person role as the fourth Founding Engineer at a B2B AI SaaS startup (Poetic), where I worked in the most beautiful castle-like hacker houses with an incredibly talented group of humans. The hours were intense but the plot was equally invigorating. It was a surreal experience trying Opus 4.5 for the first time late at night with the rest of the team, and feeling the weight of the air shift in real time.

All of these experiences, though unique, were tightly stitched together. Often times I joined a new company the day after I left the previous one. Most of the time, this felt right for me. I don't like killing momentum without a good reason.

This time however, I left with no plan.

## Why?

While I had been working on cool projects like DSL-specialized coding agents, integrating new durable execution platforms, and single-tenant infrastructure (this one was less cool), it left me with little mental energy to think about all of the innovations that were happening outside the company vacuum.

When I tried to get a peek at what was happening on the outside by talking to other founders and engineers in the space, I would get inundated with the same cookie-cutter "code sandbox + agent + version-controlled repo with business logic" product time and time again, and each person was convinced that their solution was unique and would take the entire market. When I asked friends at the frontier labs what they were up to, their work was always frustratingly confidential.

Thus, I made the difficult decision to part ways with Poetic, and take some time to clear my head and explore the outside world with fresh eyes.

## Local Model Shenanigans

Now that I could no longer use my magical VC-funded frontier lab API keys to print unlimited tokens, I bought a personal Claude Max subscription and spent a lot of time messing with local AI models.

> When I say local inference, I'm specifically referring to models that fit on consumer-range Apple devices. Kimi 3 and GLM 5.1 were great releases and I did play with them a lot, but I hosted them in the cloud because I don't got RAM like that.

The last time I tinkered with these small open-weight models was when I first moved to San Francisco, and they were pretty bad at the time. Now, they were starting to become usable for well-scoped use-cases.

I set up an Ollama server on my Mac Studio (64GB RAM) and served it in my Tailnet via Tailscale so I could run a decent variety of local models from my laptop. Gemma4 26B A4B was one of the models I was particularly impressed with, and was the first introduction I had to the MoE architecture.

I experimented with local models for a variety of use-cases like organizing photography and code-review pipelines. However, the deepest rabbit hole and the one I would spend most of my break on was language learning.

## Language Learning

Besides breakdancing, studying Japanese is one of the few hobbies I've actually kept up with in the last few years. I started studying around three years ago and my hours had certainly taken a hit during my most recent job, but this break was a good opportunity to get serious about it again.

<figure>
  <img src="/images/signals/2026-08-26-breaking-my-career/breakdance.gif" alt="Looping black-and-white clip of me breakdancing in a gym">
  <figcaption>Fun fact: breakdancing is my main form of exercise.</figcaption>
</figure>

I was in the immersion phase of my Japanese study, which is essentially mining grammar and vocabulary from native content like movies and video games. This is the hardest phase of language learning because it is unstructured and the longest stretch to fluency.

During the little free time I had in my last job, I had actually created a browser-based harness that ran OCR using a frontier model on native Japanese text to convert it into vocabulary words. I thought it would be a fun project to build a more serious version of this with some newer requirements.

<figure>
  <img src="/images/signals/2026-08-26-breaking-my-career/blossom-prototype-full.webp" alt="Screenshot of a browser-based Japanese learning tool showing a YouTube video with a translation and vocabulary breakdown panel" width="4710" height="2294">
  <figcaption>An early prototype of Oxalis called Blossom.</figcaption>
</figure>

1. Allow capturing content anywhere on the screen, not just the browser.
2. Use a fully local inference stack.
3. Make it available for others.

The local inference side of this was especially interesting to me, as it makes the economics of this project more indie-project like as opposed to something like Duolingo, where the business needs to pay for cloud inference costs. Since I designed Oxalis with a full local inference stack, it costs me almost nothing to distribute it.

This project ended up being called Oxalis, named after the Oxalis Triangularis plant that sprouted in my apartment shortly after designing the prototype for the project. You can read the less technical story of why I wanted to build this in [this blog](https://oxalis.ink/blog/2026-08-09-why-i-built-oxalis).

## Asia Travel - Tokyo and Shanghai

Though I worked on and actively used Oxalis throughout my entire break, I also made sure to carve out sufficient time to touch grass and explore.

I traveled for 1 week in Tokyo and 2 weeks in Shanghai to spend some much needed time with some important people in my life. You can see some photos I took in the [Tokyo](/memories/tokyo-revengers) and [Shanghai](/memories/pearls) memories.

<figure class="figure-inset" style="--figure-width: 50%; margin-left: 0">
  <img src="/images/signals/2026-08-26-breaking-my-career/toto-full.webp" alt="Black-and-white photo of a tortoiseshell cat sprawled out on a paved walkway at night next to a person crouching beside it" width="1200" height="900">
  <figcaption>Me hanging out with my favorite Shanghai stray cat Toto.</figcaption>
</figure>

I love both of these countries, and I hope to visit them both again soon.

## Oxalis Learnings

Ok... back to the nerdy stuff. Here are some of the learnings I had from working on this thing.

### Packaging Local Inference Into A Desktop App

Packaging local inference into desktop applications is not a common pattern right now, but it does work, and you do need to be cautious in implementing it even with the help of LLM's. For Oxalis, I packaged llama.cpp directly into the application as a secure side-car that the app could use for local inference. I chose this over an MLX runtime because it would be easier to port the product to Windows as well. Generally, the gguf ecosystem is also more battle-tested and reliable as well.

### Local Inference Is Not Mature

llama.cpp has a pretty hard job of having to keep up with all of the new model releases that happen. For example, after the Gemma4 release, Gemma4 12B was also released, and MTP drafters for all models in the family were also released. These are all things llama.cpp needs to support. They are good at keeping up, but bugs are definitely something to watch for.

### Fine-Tuning Is Cool

In my last job, we fully embraced the frontier and did not fine-tune any models whatsoever. I'm not and never have been an ML Engineer, but given that Fable was now part of the Claude Max subscription I decided to see if I could fine-tune Gemma E2B/E4B for Oxalis workloads myself on a Mac Studio.

To generate a dataset, I created a pipeline that takes in videos of native content, breaks them into screenshots, de-dupes with a frame diff algorithm, and uses a larger open-weight model hosted on the cloud to generate labels. On top of that, I augmented the dataset with my own Oxalis usage data. This gave a pretty diverse set of screenshots from videos, games, articles, etc.

After creating the dataset, I worked with Fable to set up an MLX training pipeline on my Mac Studio with unsloth, and even trained new MTP drafters with comparable acceptance rates to the stock Gemma4 e2b/e4b models.

I'm still iterating on this model (Shamrock) but for now it benchmarks way better than stock Gemma4 E2B/E4B for Oxalis workloads, both in accuracy and speed. For transcribing YouTube videos to vocab breakdowns specifically, I got Shamrock E2B to eval comparably to Gemma4 E4B, which was great especially for edge inference where the snappiness of E2B is much preferred. I generated my evals for these tasks with the same pipeline I used to generate the training data.

> Shamrock weights are [here](https://huggingface.co/oxalis-ink/shamrock-0-e2b). The name comes from False Shamrock (or Purple Shamrock), another name for the Oxalis Triangularis plant, which is the design inspiration for Oxalis.

This type of ML Engineering is not something I touched at all in my previous role, and while I'm far from competent in this area, it opened my eyes to the possibilities of open-weight models with fine-tuning.

### Check It Out

Lastly, if you want to take a peek at the product itself, check it out at [oxalis.ink](https://oxalis.ink/) or just watch the demo below.

<iframe src="https://www.youtube-nocookie.com/embed/eWpK0Y7gz0U" title="Oxalis demo"></iframe>

## Building Is Still Hard

Looking at Oxalis at the surface level, I think it would be one of those products that people would claim can be vibe-coded in one sitting. While I think you actually could get some prototype that resembles it, I'm confident you can't achieve the same quality in that time period.

This was one of the first projects I worked on where I had access to frontier models since its conception. I used Opus 4.7 and Fable 5 from the very beginning of creating Oxalis to its current maintenance today. I can assure you that if I could have vibe-coded the whole thing in one sitting I would have. Instead, it took around 3 months of consistent work to create and iterate on the product, and also write all of the blog posts and graphics to explain what it even is.

All of this is to say that I don't think we've gotten to a point where AI sandbox + coding agent + yolo is a formula for a great product. Craft still matters, and I don't see the core of that changing any time soon.

<figure>
  <img src="/images/signals/2026-08-26-breaking-my-career/oxalis-ultra-moon-full.webp" alt="Screenshot of Oxalis showing a translation and vocabulary breakdown of a dialogue line from Pokémon Ultra Moon" width="2572" height="1542">
  <figcaption>Playing Ultra Moon with Oxalis.</figcaption>
</figure>

## What's Next?

I'm not sure, but I think that now that I've had the time to experiment and talk to more folks to refine my opinions, I have some more intuition on the types of problems I want to work on next.

Maybe I'll share those another time.
