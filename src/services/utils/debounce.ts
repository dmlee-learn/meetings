/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
 * This is used to prevent excessive database writes during high-frequency updates.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns The debounced function.
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T;
}
