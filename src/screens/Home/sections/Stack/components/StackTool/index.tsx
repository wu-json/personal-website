import { StackTool as StackToolType } from 'src/screens/Home/sections/Stack/types';

const StackTool = ({ stackTool }: { stackTool: StackToolType }) => (
  <div>
    <a href={stackTool.href} className="inline-block no-underline m-[15px] h-[60px] hover-lift-scale">
      <img src={stackTool.logo.src} alt={stackTool.logo.alt} className="h-full" />
    </a>
  </div>
);

export { StackTool };
