import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles.wrapper}>
    <div className={styles.container}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a founding engineer at Forge, and Yale University graduate (2022).
          I like working with TypeScript, Neovim, observability, and durable
          execution tools.
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
