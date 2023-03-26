import { useEffect } from 'react';


const useBeforeUnload = (downloading: boolean) => {
  useEffect(() => {
    const controller = new AbortController();

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (downloading) {
        event.preventDefault();
        event.returnValue = '';

        controller.abort();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [downloading]);
};

export default useBeforeUnload;
