import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a senior software engineer at Snackpass, and Yale University
          graduate (2022). At work, I primarily work on cloud infrastructure
          (Kubernetes and AWS), but I also have a strong full stack background.
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
