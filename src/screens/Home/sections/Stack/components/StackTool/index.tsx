import { StackTool as StackToolType } from 'src/screens/Home/sections/Stack/types';

import styles from './styles.module.scss';

const StackTool = ({ stackTool }: { stackTool: StackToolType }) => (
    <div className={styles['wrapper']}>
        <a href={stackTool.href}>
            <img src={stackTool.logo.src} alt={stackTool.logo.alt} />
        </a>
    </div>
);

export { StackTool };
