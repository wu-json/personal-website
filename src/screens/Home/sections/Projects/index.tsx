import { Project } from './components/Project';
import { PROJECTS } from './constants';
import styles from './styles.module.scss';

const Projects = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>stuff i've built</h1>
      <div className={styles['projects-container']}>
        {PROJECTS.map((project, i) => (
          <Project project={project} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Projects };
