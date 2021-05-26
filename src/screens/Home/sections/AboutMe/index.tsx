import styles from './styles.module.scss';

const AboutMe = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <h1>about me</h1>
            <div className={styles['text-wrapper']}>
                <p>
                    I'm a rising senior at Yale University pursuing a B.S. in
                    Computer Science, and Software Engineer at Amazon. I'm super
                    interested in GraphQL and Finance. In my free time, I like
                    making LoFi music.
                </p>
            </div>
        </div>
    </div>
);

export { AboutMe };
