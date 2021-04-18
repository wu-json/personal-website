import styles from './styles.module.scss';

const AboutMe = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <h1>about me</h1>
            <div className={styles['text-wrapper']}>
                <p>
                    I'm a junior at Yale University pursuing a B.S. in Computer
                    Science, and Full Stack Software Engineer at Snackpass. In
                    my free time, I like making LoFi music and reading about
                    DeFi.
                </p>
            </div>
        </div>
    </div>
);

export { AboutMe };
