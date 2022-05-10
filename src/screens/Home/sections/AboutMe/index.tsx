import styles from './styles.module.scss';

const AboutMe = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <h1>about me</h1>
      <div className={styles['text-wrapper']}>
        <p>
          I'm a Yale grad with a B.S. in Computer Science. I'm super interested
          in GraphQL and Finance. In my free time, I like breakdancing and
          playing Valorant (I'm not good though).
        </p>
      </div>
    </div>
  </div>
);

export { AboutMe };
