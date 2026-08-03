---
id: '2026-08-02-oss-and-photography'
timestamp: '2026.08.02 // 14:43:45'
title: 'OSS & Photography'
expanded: false
location: '上海，中国'
---

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/DSCF3239-full.webp" alt="Stray dog on the pavement" width="4992" height="3328">
<figcaption>A dog eating a pork bun at the summit of a cable car path in 无锡，中国.</figcaption>
</figure>

Photography has been my creative cigarette for around 3 years now, and in the midst of this career break I've been flicking the ashes of my shutter button into various visual projects across Asia.

> "I wander around, glare at things, and bark from time to time."
>
> — 森山大道

While I prefer Moriyama's primal "stray dog" philosophy when capturing photos, my post-processing routine is rather tame by comparison.

Once the bytes leave my camera, they are sent to a digital fortress of software tools where they get forged into works of art or works of trash.

I'll quickly tour you around this fortress. It will be a nice opportunity to shout-out some of the excellent tools that have helped me express myself over the years, and hopefully inspire some new photographers and homelabbers.

# Cameras

First, let's take a quick look at the blades I've taken with me in my excursions.

I mainly shoot with a second-hand FujiFilm XE4 I bought on Ebay a few years ago. It has interchangeable lenses so I can use old German and Soviet lenses with the help of many obscure X-mount adapters, but I find myself leaning into pancake primes more often than not for portability.

<figure class="figure-inset" style="--figure-width: 65%">
<img src="/images/signals/2026-08-02-oss-and-photography/fujifilm-xe4-full.webp" alt="FujiFilm X-E4 with a pancake prime attached" width="4032" height="3024">
</figure>

Don't tell my XE4 about this, but I'll occasionally do photowalks with inexpensive used digital cameras on Ebay. The Canon IXY has been one of my favorites, and has a design that makes me wish we froze the state of hardware in 2004.

<figure class="figure-inset" style="--figure-width: 65%">
<img src="/images/signals/2026-08-02-oss-and-photography/canon-ixus-full.webp" alt="Silver Canon compact camera" width="4032" height="3024">
</figure>

None of the cameras I shoot with are up to date flagships, and each have many physical faults, some by design and some by prior mistreatment. This is great because I find perfect devices to be uninspiring.

# After the Shoot

I return with an SD card packed with JPEGs, each of which encodes a (lossy) visual story.

> I don't shoot RAW because I don't care about image quality. As long as an image smells nice, the details are not important to me.

Even this early into the process, one can make catastrophic mistakes.

## Fat Fingers

Maybe around 4 months ago, I ended up in the Panhandle after 8 hours of shooting around San Francisco. I had captured several surreal scenes. A man riding a bike with bubbles flying out the back making sounds of popping bubblegum, and a singer with a ukulele posted under a perfect topologically imperfect tree with a grand statue protecting him from behind.

I giddily reviewed the photos while taking cover under a tree myself, deleting duds. It's here that I would learn a very important lesson.

> Never delete photos in the field.

My finger slipped and somehow I had deleted every photo on my camera.

> Dear FujiFilm,
>
> Please do not put the "DELETE ALL FRAMES" option right below "DELETE SINGLE FRAME". It seems that I'm not the only [victim](https://www.reddit.com/r/fujifilm/comments/1ijselx/why_the_fuck_is_delete_all_frames_next_to_delete/).
>
> This UX has possibly improved with software updates by now, but it's still mind-boggling to me that this design ever made it past review.

I panicked and even reopened the playback menu a few times only to be met with a "no images" screen on every attempt. I walked back home, holding on to nothing but the hope that I'd be able to find some magical software to save the day when I got back to my computer.

> If you happen find yourself in this situation, make sure to stop shooting at once or you risk overwriting your precious data.

It turns out, magical software did indeed exist. [PhotoRec](https://github.com/cgsecurity/testdisk) recovers lost images by scanning your disk against a known dictionary of file signatures and essentially fishing out the right boundaries in the bytes, where the survivors of your photoshoot may lie.

I installed it with Homebrew, had a coding agent inspect the source code to learn the ropes, and sent it on the task of recovering my snapshots.

Within a few minutes, I started to see my photos rise from the dead into a new directory on my computer.

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/bubble-bike-full.webp" alt="Cyclist trailing soap bubbles down a park path" width="3192" height="2128">
</figure>

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/ukulele-tree-full.webp" alt="Ukulele player seated under a tree below a statue" width="2818" height="4227">
</figure>

Not all of them were recoverable and some had major visual artifacts from corruption (perhaps the camera was writing some new data there when I was fiddling with the menus), but 95% of them made it back home safe and sound.

I hope none of you experience this, but if you do, know that you might be able to prompt your way out of this situation too.

## We Are Not Losing Those Files Again

Our files are precious and cause tremendous stress when they disappear. How can we store them and sleep well at night?

You could throw them in Google Photos and call it a day, but personally I take a lot of photos...

And also bought a [NAS](https://en.wikipedia.org/wiki/Network-attached_storage) on a whim after seeing some obnoxious ad-read on YouTube (these work sometimes unfortunately).

This is where we introduce the holy grail of OSS photo management. [Immich](https://github.com/immich-app/immich) provides a fully self-hosted Google Photos experience. It's also configurable via Docker which is perfect for those who already run Docker on their NAS for other apps.

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/immich-full.webp" alt="Immich photo grid" width="2518" height="1312">
<figcaption>Immich interface.</figcaption>
</figure>

With the help of [Tailscale](https://tailscale.com/), I was able to also make this available in my Tailnet so I could access my photos securely even outside my local network.

Now I can store a bunch of images using my own drives and not have to worry about ballooning Google One costs.

## Hold On... Let's Back Up

We still need backups, and personally the chances of my clumsy hands spilling coffee on my NAS is non-zero so there is still work to be done on the storage side.

For backups, I configured a simple cron job on my NAS that uses [rsync](https://github.com/RsyncProject/rsync) to back up encrypted Immich media directories to [Backblaze B2](https://www.backblaze.com/). This job runs every night when I sleep and notifies me when it fails (hasn't happened yet... I should probably check on it).

## Editing

For me, editing is one of the most satisfying parts of the process as it's where the vision is refined and everything truly comes together.

I've been using [darktable](https://www.darktable.org/) to edit photos for as long as I can remember. It's great because it's non-destructive, which means you can directly import photos and make changes without worrying whether that grain effect you saved by accident just altered history forever.

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/darktable-full.webp" alt="darktable lighttable view with a grid of photos" width="2394" height="942">
<figcaption>Darktable's lighttable.</figcaption>
</figure>

I haven't used other competitive closed-source alternatives before (Adobe Lightroom), but I've never felt the need to try other options.

Darktable is free and ergonomic, so I think I'll stick with it for some time.

## AI & Photography

Though I briefly hinted at this in my JPEG rescue mission story, I want to point out that AI was quite helpful in setting this whole system up.

Coding agents helped drive the rescue of my JPEGs, write yaml configurations to set up my photo storage solution, and organize my photo archives.

When it comes to actually editing photos, I like to do that by hand in darktable. However, everything leading up to that point (e.g. organizing files + configuring storage and backups) is not creatively stimulating for me and I'm glad AI can help me in those areas.

## Ending Note

Use OSS tools and build systems to help you manage the parts of your artistic process that aren't artistic. That way you can focus on the fun parts.

<figure>
<img src="/images/signals/2026-08-02-oss-and-photography/shanghai-dancers-full.webp" alt="Couples ballroom dancing at night under lit trees" width="3929" height="2619">
<figcaption>Shanghai Waltz</figcaption>
</figure>
