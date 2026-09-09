import { useState } from 'react';

export function useKeypad() {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    setOpen,
  };
}
