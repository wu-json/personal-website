import { DarkPear } from "./DarkPear";
import { SOCIALS } from "./constants";
import styles from "./styles.module.scss";

const MainBanner = () => (
  <div className={styles.wrapper}>
    <div className={styles.container}>
      <div className={styles.profile}>
        <DarkPear />
      </div>
      <div className={styles["text-container"]}>
        <h1>jason wu</h1>
        <h2>software @forge</h2>
        <div className={styles["socials-container"]}>
          {SOCIALS.map((social) => (
            <a href={social.href} key={social.href}>
              <img src={social.icon.src} alt={social.icon.alt} />
            </a>
          ))}
        </div>
        <a className={styles["button-wrapper"]} href="/jasonwu-resume.pdf">
          <button type="button">resume</button>
        </a>
      </div>
    </div>
  </div>
);

export { MainBanner };
