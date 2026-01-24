
import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const scrollbarWidthRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = window.getComputedStyle(document.body).overflow;
      scrollbarWidthRef.current = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidthRef.current}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = '0px';
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-2 bg-slate-900/90 md:backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
