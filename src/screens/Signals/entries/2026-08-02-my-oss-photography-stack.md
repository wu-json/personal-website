---
id: '2026-08-02-my-oss-photography-stack'
timestamp: '2026.08.02 // 14:43:45'
title: 'My OSS Photography Fortress'
expanded: false
location: 'Shanghai, China'
---

Photography has been my creative cigarette for around 3 years now, and in the midst of this career break I've been flicking the ashes of my shutter button into various visual projects across Asia.

> "I wander around, glare at things, and bark from time to time."
>
> — 森山大道


While I prefer Moriyama's primal "stray dog" philosophy when capturing photos, my post-processing routine is rather domesticated by comparison.


Once the bytes leave my camera, they are sent to a humble digital fortress of software tools where they get forged into works of art or works of trash.

I'll quickly tour you around this fortress today. It will be a nice opportunity to shout-out some of the excellent tools that have helped me express myself over the years, and hopefully inspire some new photographers and homelabbers (we really need a better name for this) in the process.

# My Camera

Before we go into the fortress, let's take a quick look at the blades I've taken with me in my excursions. 

I mainly shoot with a second-hand FujiFilm XE4 I bought on Ebay a few years ago. It has interchangeable lenses so I can use old German and Soviet lenses with the help of many obscure adapters, but I find myself leaning into pancake primes more often than not for the portability.

Don't tell my XE4 about this, but on occasion I will also do photo-walks with very inexpensive used digital cameras on Ebay. The Canon IXUS H200 has been one of my favorites, and has a design that makes me wish we froze the state of hardware in 2009.

None of the cameras I shoot with are the latest, and come with many physical faults. This is great because I find perfect devices to be uninspiring.

# After the Shoot

I return with an SD card packed with JPEGs, each of which encodes a lossy visual story.

> I don't shoot RAW because I don't really care about image quality. As long as the image smells nice, the details are not important to me.
>
> This is also why shooting with old digital cameras is still fun.

Even this early into the process, one can make catastrophic mistakes.

## Fat Fingers

Maybe around 4 months ago, I had ended up in the Panhandle after 8 hours of shooting around San Francisco. I had captured several once in a lifetime scenes that felt almost surreal. A man rode a bike with bubbles flying out the back making sounds of popping bubblegum, and a singer with a Ukulele posted under a topological perfectly imperfect tree with an audacious statue protecting him from behind.

I giddily reviewed the photos while taking cover under a tree myself, deleting the misfires. It is here that I would learn a very important rule of photography.

> Never delete photos in the field.

My finger slipped while attempting to clean out a blurry photo of the grass I had taken by accident, and somehow I had deleted every photo on my camera.

> To FujiFilm, 
>
> Please do not put the "DELETE ALL FRAMES" menu item right next to the "DELETE SINGLE FRAME" menu item. It seems that I'm not the only one who has made [this fatal mistake](https://www.reddit.com/r/fujifilm/comments/1ijselx/why_the_fuck_is_delete_all_frames_next_to_delete/).
>
> It's possible this UX is improved on more recent versions of the software, but it's still mind-boggling to me that this design made it past review.

I immediately panicked, and even reopened the playback menu a few times only to be met with a "No images." screen on every attempt. I walked back home, holding on to nothing but the hope that I'd be able to recover some of my photos with some magical software when I got to my computer.

> If you happen to be in this situation at any point, make sure to stop taking any new photos. Turn the camera off, or you risk overwriting your hopes and dreams of recovering that data.

It turns out, that magical software did indeed exist: [PhotoRec](https://github.com/cgsecurity/testdisk). PhotoRec recovers lost images by scanning your disk against a known dictionary of file signatures and essentially fishing out the right boundaries in your bytes, between which the survivors of your photoshoot may lie. 

I installed it with Homebrew, had a coding agent inspect the source code to learn the ropes, and sent it on the task of recovering my snapshots.

Within a few minutes, I started to see my photos rise from the dead into a new directory on my computer. Not all of them were recoverable and some had major visual artifacts from corruption, but I would say 95% of them made it back home safe and sound.

Thank you OSS.

## We Are Not Losing Those Files Again
