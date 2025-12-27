import { Project } from './components/Project';
import { PROJECTS } from './constants';

const Projects = () => (
  <div className="w-full flex items-center justify-center max-[800px]:-mt-[90px]">
    <div className="flex flex-col text-center justify-center w-[500px] max-[800px]:px-[60px]">
      <h1 className="mb-0">stuff i've built</h1>
      <div className="py-[60px] px-0 flex flex-col items-start max-[800px]:items-center">
        {PROJECTS.map((project, i) => (
          <Project project={project} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Projects };
