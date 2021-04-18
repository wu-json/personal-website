import NyanCat from 'src/assets/graphics/nyan-cat.gif';

import { SOCIALS } from './constants';
import styles from './styles.module.scss';

const MainBanner = () => {
    return (
        <div className={styles['page']}>
            <div className={styles['container']}>
                <img
                    className={styles['nyan-cat']}
                    src={NyanCat}
                    alt="nyan-cat"
                />
                <div className={styles['text-container']}>
                    <h1>jason wu</h1>
                    <h2>swe @snackpass</h2>
                    <div className={styles['socials-container']}>
                        {SOCIALS.map(social => (
                            <a href={social.href}>
                                <img
                                    src={social.icon.src}
                                    alt={social.icon.alt}
                                />
                            </a>
                        ))}
                    </div>
                    <button>resume</button>
                </div>
            </div>
        </div>
    );
};

export { MainBanner };
