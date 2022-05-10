import { Job as JobType } from 'src/screens/Home/sections/Jobs/types';

import styles from './styles.module.scss';

const Job = ({ job }: { job: JobType }) => (
  <div className={styles['container']}>
    <a href={job.href}>
      <img src={job.logo.src} alt={job.logo.alt} />
    </a>
    <div className={styles['text-container']}>
      <h2>{job.companyName}</h2>
      <h3>{`${job.title}, ${job.duration}`}</h3>
    </div>
  </div>
);

export { Job };
