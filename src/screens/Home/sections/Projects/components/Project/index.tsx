import { Project as ProjectType } from 'src/screens/Home/sections/Projects/types';

const Project = ({ project }: { project: ProjectType }) => (
  <div className="flex items-center justify-start mb-[50px] max-[800px]:flex-col max-[800px]:mb-[60px]">
    <a href={project.href} className="no-underline hover-lift">
      <img src={project.logo.src} alt={project.logo.alt} className="w-20 mr-[30px] max-[800px]:m-0 max-[800px]:mb-5" />
    </a>
    <div className="text-left leading-[2em] max-[800px]:text-center">
      <h2 className="text-[26px] font-semibold text-mineshaft m-0">{project.projectName}</h2>
      <h3 className="text-[18px] font-light text-mineshaft m-0">{project.desc}</h3>
    </div>
  </div>
);

export { Project };
