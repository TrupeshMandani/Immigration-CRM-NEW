import { uploadService } from "../../services/uploadService";

const FilePreview = ({
  file,
  onRemove,
  showRemove = true,
  showSize = true,
  showType = true,
  compact = false,
}) => {
  const getFileIcon = (file) => {
    if (file?.mimeType) {
      return uploadService.getFileIcon(file.mimeType);
    }
    if (file?.type) {
      return uploadService.getFileIcon(file.type);
    }
    return "📁";
  };

  const getFileName = (file) => {
    return (
      file.originalName || file.name || file.originalname || "Unknown file"
    );
  };

  const getFileSize = (file) => {
    if (file.size) {
      return uploadService.formatFileSize(file.size);
    }
    return null;
  };

  const getFileType = (file) => {
    if (file?.mimeType && typeof file.mimeType === "string") {
      return file.mimeType.split("/")[1]?.toUpperCase() || "FILE";
    }
    if (file?.type && typeof file.type === "string") {
      return file.type.split("/")[1]?.toUpperCase() || "FILE";
    }
    return "FILE";
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getFileIcon(file)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getFileName(file)}
            </p>
            {showSize && getFileSize(file) && (
              <p className="text-xs text-gray-500">{getFileSize(file)}</p>
            )}
          </div>
        </div>
        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(file)}
            className="text-red-500 hover:text-red-700 p-1"
            title="Remove file"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm">
      <div className="flex-shrink-0">
        <span className="text-2xl">{getFileIcon(file)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {getFileName(file)}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          {showType && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getFileType(file)}
            </span>
          )}
          {showSize && getFileSize(file) && (
            <span className="text-xs text-gray-500">{getFileSize(file)}</span>
          )}
        </div>
      </div>
      {showRemove && onRemove && (
        <button
          onClick={() => onRemove(file)}
          className="flex-shrink-0 text-red-500 hover:text-red-700 p-1 rounded"
          title="Remove file"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default FilePreview;
