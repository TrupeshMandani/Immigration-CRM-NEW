import ApplicantLayout from "../../components/layout/ApplicantLayout";
import ChatInterface from "../../components/applicant/ChatInterface";

export default function AssistantPage() {
  return (
    <ApplicantLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">AI Immigration Assistant</h1>
            <p className="text-xs text-gray-500">Context-aware help for your case — ask anything</p>
          </div>
        </div>
        <ChatInterface />
      </div>
    </ApplicantLayout>
  );
}
