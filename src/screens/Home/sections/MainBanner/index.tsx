import NyanCat from 'src/assets/graphics/nyan-cat.gif';

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
            </div>
        </div>
    );
};

export { MainBanner };
