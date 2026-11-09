import React from 'react';
export default function PageHeader({
  title,
  description,
  kicker,
  actions
}) {
  return <div className="mm-page-header"><div>{kicker && <div className="mm-page-kicker">{kicker}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
