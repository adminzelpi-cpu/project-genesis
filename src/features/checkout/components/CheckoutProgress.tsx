import React from 'react';
import { cn } from '@/lib/utils';

interface CheckoutProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const CheckoutProgress: React.FC<CheckoutProgressProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { number: 1, title: 'Identificação' },
    { number: 2, title: 'Endereço de entrega' },
    { number: 3, title: 'Forma de pagamento' },
  ];

  const handleStepClick = (stepNumber: number) => {
    // Only allow clicking on completed steps or the current step
    if (stepNumber <= currentStep && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="w-full mb-3">
      <div className="flex items-start justify-between relative">
        {/* Background line */}
        <div className="absolute top-3 left-0 right-0 h-[4px] bg-checkout-step-inactive z-0" />
        
        {/* Progress line - uses store primary color */}
        <div 
          className="absolute top-3 left-0 h-[4px] z-0 transition-all duration-500"
          style={{ 
            backgroundColor: 'hsl(var(--store-primary, 222.2 47.4% 11.2%))',
            width: currentStep === 1 ? '33.33%' : currentStep === 2 ? '66.67%' : '100%' 
          }}
        />
        
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center relative z-10 flex-1">
            <button
              onClick={() => handleStepClick(step.number)}
              disabled={step.number > currentStep}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold mb-1 transition-all duration-200 bg-white border-2",
                step.number < currentStep
                  ? "text-white cursor-pointer hover:scale-105"
                  : step.number === currentStep
                  ? "text-white"
                  : "border-checkout-step-inactive text-checkout-text-inactive cursor-not-allowed",
                step.number <= currentStep && "shadow-sm"
              )}
              style={
                step.number <= currentStep
                  ? {
                      backgroundColor: 'hsl(var(--store-primary, 222.2 47.4% 11.2%))',
                      borderColor: 'hsl(var(--store-primary, 222.2 47.4% 11.2%))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1'
                    }
                  : {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1'
                    }
              }
            >
              {step.number}
            </button>
            <span
              className={cn(
                "text-[10px] text-center px-1 transition-colors duration-200 max-w-[80px]",
                step.number <= currentStep
                  ? "text-checkout-text-active font-medium"
                  : "text-checkout-text-inactive"
              )}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
