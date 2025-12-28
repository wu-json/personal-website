import { JOBS, type Job } from './constants';

const JobCard = ({ job }: { job: Job }) => (
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

const Jobs = () => (
  <div className="w-full flex items-center justify-center mt-[60px] max-[800px]:mt-0">
    <div className="flex flex-col text-center justify-center w-[500px] max-[800px]:p-[60px]">
      <h1 className="mb-0">where i've worked</h1>
      <div className="py-[60px] px-0 flex flex-col items-start max-[800px]:items-center">
        {JOBS.map((job, i) => (
          <JobCard job={job} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Jobs };
