import styles from './styles.module.scss';

const Stack = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <h1>what i've been using lately</h1>
            <div className={styles['stack-container']}></div>
        </div>
    </div>
);

export { Stack };
