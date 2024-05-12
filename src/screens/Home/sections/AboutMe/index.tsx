import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a senior software engineer at Fizz, and Yale University graduate
          (2022). These days, I primarily work on our backend APIs and durable
          execution workflows with Temporal using TypeScript (I use Neovim btw).
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
