import { useState } from 'react';
import { toast } from 'react-toastify';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../../lib/languages.js';
import { useUserStore } from '../../../lib/stores/userStore.js';

export default function LanguageSettings({ onClose }) {
  const currentUser = useUserStore((s) => s.currentUser);
  const updatePreferredLanguage = useUserStore((s) => s.updatePreferredLanguage);
  const [saving, setSaving] = useState(false);
  const value = currentUser?.preferredLanguage ?? DEFAULT_LANGUAGE;

  const onChange = async (e) => {
    setSaving(true);
    try { await updatePreferredLanguage(e.target.value); toast.success('Language updated. New messages will be translated for you.'); }
    catch (err) { console.error(err); toast.error('Could not save your language.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="languageSettings" role="dialog" aria-label="Settings">
      <label htmlFor="preferredLanguage">
        Show me messages in
        <small className="hint">What others write is translated into this language for you.</small>
      </label>
      <select id="preferredLanguage" value={value} onChange={onChange} disabled={saving}>
        {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} · {l.nativeName}</option>)}
      </select>
      <button type="button" onClick={onClose}>Done</button>
    </div>
  );
}
