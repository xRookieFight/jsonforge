import { useState } from "react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { TemplateId } from "../../core/services/templates/ProjectTemplates";
import { ModalShell } from "./ModalShell";

interface Props {
  open: boolean;
  onClose(): void;
}

export function NewProjectModal({ open, onClose }: Props) {
  const [name, setName] = useState("untitled_form");
  const [namespace, setNamespace] = useState("custom_namespace");
  const [template, setTemplate] = useState<TemplateId>("server_form");

  const submit = () => {
    Container.resolve<ProjectService>(ProjectService.NAME).createNew(name, namespace, template);
    onClose();
  };

  return (
    <ModalShell title="New Project" open={open} onClose={onClose}>
      <div className="jf-form">
        <div className="jf-form__row">
          <label>Name</label>
          <input className="jf-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="jf-form__row">
          <label>Namespace</label>
          <input className="jf-input" value={namespace} onChange={e => setNamespace(e.target.value)} />
        </div>
        <div className="jf-form__row">
          <label>Template</label>
          <select className="jf-input" value={template} onChange={e => setTemplate(e.target.value as TemplateId)}>
            <option value="server_form">Server Form (vanilla)</option>
            <option value="blank">Blank Panel</option>
          </select>
        </div>
        <div className="jf-form__actions">
          <button type="button" className="jf-btn jf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="jf-btn jf-btn--primary" onClick={submit}>Create</button>
        </div>
      </div>
    </ModalShell>
  );
}
