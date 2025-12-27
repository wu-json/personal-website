import { Job as JobType } from 'src/screens/Home/sections/Jobs/types';

const Job = ({ job }: { job: JobType }) => (
  <div className="flex items-center justify-start mb-[50px] max-[800px]:flex-col max-[800px]:mb-[60px]">
    <a href={job.href} className="no-underline hover-lift">
      <img src={job.logo.src} alt={job.logo.alt} className="w-20 rounded-full mr-[30px] max-[800px]:m-0 max-[800px]:mb-5" />
    </a>
    <div className="text-left leading-[2em] max-[800px]:text-center">
      <h2 className="text-[26px] font-semibold text-mineshaft m-0">{job.companyName}</h2>
      <h3 className="text-[18px] font-light text-mineshaft m-0">{`${job.title}, ${job.duration}`}</h3>
    </div>
  </div>
);

export { Job };
