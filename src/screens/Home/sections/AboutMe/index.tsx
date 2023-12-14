import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a senior software engineer at Snackpass, and Yale University
          graduate (2022). These days, I primarily work on cloud infrastructure
          (Kubernetes on AWS EKS), but my background is primarily in full stack
          development.
        </p>
        <p>
          Other tools I'm really enjoying right now are Temporal, Fly.io,
          Turborepo, and Neovim.
        </p>
        <p>
          I also run a YouTube channel called{' '}
          <a href='https://www.youtube.com/@darkpear_'>The Dark Pear</a>, where
          I make videos on game development and various personal technical
          projects.
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
