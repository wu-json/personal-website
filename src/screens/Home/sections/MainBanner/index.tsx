import { CrypticPortal } from './CrypticPortal';

const MainBanner = () => (
  <div className="w-full h-screen bg-black flex items-center justify-center">
    <div className="w-[600px] h-[600px] max-[800px]:w-[400px] max-[800px]:h-[400px]">
      <CrypticPortal />
    </div>
  </div>
);

export { MainBanner };
