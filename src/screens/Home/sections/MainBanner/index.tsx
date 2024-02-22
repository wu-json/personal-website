import { DarkPear } from './DarkPear';
import { SOCIALS } from './constants';
import styles from './styles.module.scss';

const MainBanner = () => (
  <div className={styles['wrapper']}>
    <div className={styles['container']}>
      <div className={styles['profile']}>
        <DarkPear />
      </div>
      <div className={styles['text-container']}>
        <h1>jason wu</h1>
        <h2>software @fizz</h2>
        <div className={styles['socials-container']}>
          {SOCIALS.map((social, i) => (
            <a href={social.href} key={i}>
              <img src={social.icon.src} alt={social.icon.alt} />
            </a>
          ))}
        </div>
        <a className={styles['button-wrapper']} href='/jasonwu-resume.pdf'>
          <button>resume</button>
        </a>
      </div>
    </div>
  </div>
);

export { MainBanner };
