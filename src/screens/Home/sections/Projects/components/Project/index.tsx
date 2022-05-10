import { Project as ProjectType } from 'src/screens/Home/sections/Projects/types';

import styles from './styles.module.scss';

const Project = ({ project }: { project: ProjectType }) => (
  <div className={styles['container']}>
    <a href={project.href}>
      <img src={project.logo.src} alt={project.logo.alt} />
    </a>
    <div className={styles['text-container']}>
      <h2>{project.projectName}</h2>
      <h3>{project.desc}</h3>
    </div>
  </div>
);

export { Project };
