import './ExplanationLoader.css'

export default function ExplanationLoader() {
  return (
    <div className="explanation-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="explanation-loader__heading">
        <span className="explanation-loader__label">Explanation</span>
        <span className="explanation-loader__state" aria-hidden="true">Pending</span>
      </div>
      <p className="explanation-loader__title">Generating explanation</p>
      <p className="explanation-loader__description">Your response will appear here.</p>
      <div className="explanation-loader__activity" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} style={{ '--segment': index }} />
        ))}
      </div>
    </div>
  )
}
