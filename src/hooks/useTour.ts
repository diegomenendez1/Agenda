import { useEffect } from 'react';
import { driver } from "driver.js";
import type { Config, State, PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import { tourSteps } from '../config/tourConfig';

export function useTour() {
    useEffect(() => {
        // Check if tour has been completed
        const tourCompleted = localStorage.getItem('app_tour_completed');

        if (!tourCompleted) {
            const driverObj = driver({
                showProgress: true,
                steps: tourSteps,
                onDestroyStarted: () => {
                    const isLastStep = !driverObj.hasNextStep();
                    if (isLastStep || confirm("¿Quieres salir del tour? Podrás reiniciarlo desde la configuración.")) {
                        driverObj.destroy();
                        localStorage.setItem('app_tour_completed', 'true');
                    }
                },
                onPopoverRender: (popover: PopoverDOM, { config, state }: { config: Config, state: State }) => {
                    const firstButton = popover.footerButtons.firstChild as HTMLElement;
                    if (firstButton) {
                        firstButton.style.backgroundColor = '#f1f5f9';
                        firstButton.style.color = '#000';
                        firstButton.style.borderColor = 'transparent';
                    }
                }
            });

            // Small delay to ensure DOM is ready
            setTimeout(() => {
                driverObj.drive();
            }, 1000);
        }
    }, []);

    const resetTour = () => {
        localStorage.removeItem('app_tour_completed');
        window.location.reload();
    };

    return { resetTour };
}
