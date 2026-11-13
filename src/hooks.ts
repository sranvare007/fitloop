import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

const SEARCH_URL = 'http://fitloop-backend-production.up.railway.app/api/v1/exercises/search';

export type ExerciseResult = {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
};

export function useExerciseSearch(query: string) {
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}&limit=5`);
        const json = await res.json();
        if (json.success) setResults(json.data.exercises);
        else setResults([]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // iOS fires the "will" events in step with the keyboard animation; Android only has "did".
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  return visible;
}
