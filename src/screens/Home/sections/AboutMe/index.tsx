import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a senior engineer on the platform team at Snackpass, and recent
          Yale University graduate (2022). These days I work on both
          infrastructure and backend software. For work, I use TypeScript,
          Kubernetes (AWS EKS), and Terraform. For my own projects, I use Rust,
          Go, Temporal, and Fly.io.
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
