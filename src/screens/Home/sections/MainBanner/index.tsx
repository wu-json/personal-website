import NyanCat from 'src/assets/graphics/nyan-cat.gif';

import { SOCIALS } from './constants';
import styles from './styles.module.scss';

const MainBanner = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <img className={styles['nyan-cat']} src={NyanCat} alt="nyan-cat" />
            <div className={styles['text-container']}>
                <h1>jason wu</h1>
                <h2>swe @amazon</h2>
                <div className={styles['socials-container']}>
                    {SOCIALS.map((social, i) => (
                        <a href={social.href} key={i}>
                            <img src={social.icon.src} alt={social.icon.alt} />
                        </a>
                    ))}
                </div>
                <a
                    className={styles['button-wrapper']}
                    href="/jasonwu-resume.pdf"
                >
                    <button>resume</button>
                </a>
            </div>
        </div>
    </div>
);

export { MainBanner };
