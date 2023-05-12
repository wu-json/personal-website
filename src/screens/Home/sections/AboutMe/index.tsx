import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a senior platform engineer at Snackpass, and recent Yale
          University graduate (2022). While I mainly work with TypeScript, I'm
          currently learning Rust and LOVING it 🦀.
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
