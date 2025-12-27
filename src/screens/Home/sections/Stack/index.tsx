import { StackTool } from './components/StackTool';
import { STACK } from './constants';

const Stack = () => (
  <div className="w-full flex items-center justify-center mb-[120px] max-[800px]:-mt-[10px]">
    <div className="flex flex-col text-center justify-center max-w-[500px] max-[800px]:px-[60px] max-[800px]:w-full">
      <h1 className="mb-0">what i've been using lately</h1>
      <div className="py-[60px] px-0 flex items-center justify-center max-[800px]:flex-wrap">
        {STACK.map((stackTool, i) => (
          <StackTool stackTool={stackTool} key={i} />
        ))}
      </div>
    </div>
  </div>
);

export { Stack };
