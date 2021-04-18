import { Job } from './components/Job';
import { JOBS } from './constants';
import styles from './styles.module.scss';

const Jobs = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <h1>where i've worked</h1>
            <div className={styles['jobs-container']}>
                {JOBS.map((job, i) => (
                    <Job job={job} key={i} />
                ))}
            </div>
        </div>
    </div>
);

export { Jobs };
