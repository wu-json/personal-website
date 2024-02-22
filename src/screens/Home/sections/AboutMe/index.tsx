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
        <p>Outside of work, I like working with Rust and Terminal UI's.</p>
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
