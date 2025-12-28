import { STACK, type StackTool } from './constants';

const StackToolCard = ({ stackTool }: { stackTool: StackTool }) => (
  <div>
    <a href={stackTool.href} className="inline-block no-underline m-[15px] h-[60px] hover-lift-scale">
      <img src={stackTool.logo.src} alt={stackTool.logo.alt} className="h-full" />
    </a>
  </div>
);

const Stack = () => (
  <div className="w-full flex items-center justify-center mb-[120px] max-[800px]:-mt-[10px]">
    <div className="flex flex-col text-center justify-center max-w-[500px] max-[800px]:px-[60px] max-[800px]:w-full">
      <h1 className="mb-0">what i've been using lately</h1>
      <div className="py-[60px] px-0 flex items-center justify-center max-[800px]:flex-wrap">
        {STACK.map((stackTool, i) => (
          <StackToolCard stackTool={stackTool} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Stack };
