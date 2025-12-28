import { PROJECTS, type Project } from './constants';

const ProjectCard = ({ project }: { project: Project }) => (
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

const Projects = () => (
  <div className="w-full flex items-center justify-center max-[800px]:-mt-[90px]">
    <div className="flex flex-col text-center justify-center w-[500px] max-[800px]:px-[60px]">
      <h1 className="mb-0">stuff i've built</h1>
      <div className="py-[60px] px-0 flex flex-col items-start max-[800px]:items-center">
        {PROJECTS.map((project, i) => (
          <ProjectCard project={project} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Projects };
