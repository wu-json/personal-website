import styles from './styles.module.scss';

const AboutMe = () => (
    <div className={styles['wrapper']}>
        <div className={styles['container']}>
            <h1>about me</h1>
            <div className={styles['text-wrapper']}>
                <p>
                    I'm a senior at Yale University pursuing a B.S. in Computer
                    Science, and Software Engineer at Atom Finance. I'm super
                    interested in GraphQL and Finance. In my free time, I like
                    making LoFi music and playing Valorant.
                </p>
            </div>
        </div>
    </div>
);

export { AboutMe };
