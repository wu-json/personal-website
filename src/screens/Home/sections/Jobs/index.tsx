import { Job } from './components/Job';
import { JOBS } from './constants';

const Jobs = () => (
  <div className="w-full flex items-center justify-center mt-[60px] max-[800px]:mt-0">
    <div className="flex flex-col text-center justify-center w-[500px] max-[800px]:p-[60px]">
      <h1 className="mb-0">where i've worked</h1>
      <div className="py-[60px] px-0 flex flex-col items-start max-[800px]:items-center">
        {JOBS.map((job, i) => (
          <Job job={job} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Jobs };
