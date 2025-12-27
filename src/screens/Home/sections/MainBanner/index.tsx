import { SOCIALS } from './constants';
import { DarkPear } from './DarkPear';

const MainBanner = () => (
  <div className="w-full h-screen flex items-center justify-center">
    <div className="w-[600px] flex items-stretch justify-between max-[800px]:w-full max-[800px]:px-[30px] max-[800px]:flex-col max-[800px]:items-center max-[800px]:justify-center">
      <div className="w-[230px] max-[800px]:mb-0">
        <DarkPear />
      </div>
      <div className="leading-[1em] max-[800px]:text-center">
        <h1 className="font-bold text-[60px] max-[800px]:text-[40px]">jason wu</h1>
        <h2 className="font-normal text-[30px] max-[800px]:text-[26px] max-[800px]:mb-[30px]">
          software @forge
        </h2>
        <div className="mt-5 flex items-center justify-start max-[800px]:justify-center">
          {SOCIALS.map(social => (
            <a
              href={social.href}
              key={social.href}
              className="mr-5 no-underline hover-lift max-[800px]:m-2.5"
            >
              <img src={social.icon.src} alt={social.icon.alt} className="w-10" />
            </a>
          ))}
        </div>
        <a className="mt-[30px] inline-block no-underline" href='/jasonwu-resume.pdf'>
          <button type='button' className="btn-primary">resume</button>
        </a>
      </div>
    </div>
  </div>
);

export { MainBanner };
