# Storage MIME Types Mapping

## Supported MIME Types and Extensions

This document maps the supported MIME types to their corresponding file extensions used in the storage configuration system.

### Images
| MIME Type | Extension(s) |
|-----------|--------------|
| `image/jpeg` | `jpg`, `jpeg` |
| `image/jpg` | `jpg`, `jpeg` |
| `image/png` | `png` |
| `image/gif` | `gif` |
| `image/webp` | `webp` |

### Documents
| MIME Type | Extension(s) |
|-----------|--------------|
| `application/pdf` | `pdf` |
| `application/msword` | `doc` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx` |
| `text/plain` | `txt` |
| `application/vnd.ms-excel` | `xls` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx` |

### Videos
| MIME Type | Extension(s) |
|-----------|--------------|
| `video/mp4` | `mp4` |
| `video/webm` | `webm` |
| `video/ogg` | `ogg` |
| `video/avi` | `avi` |

### Audio
| MIME Type | Extension(s) |
|-----------|--------------|
| `audio/mp3` | `mp3` |
| `audio/wav` | `wav` |
| `audio/ogg` | `ogg` |
| `audio/m4a` | `m4a` |

## Default Configuration

When no storage rules are configured for a bucket, the system uses these defaults:

- **Max File Size**: 5MB
- **Allowed Extensions**: All extensions listed above (18 total)

## UI Organization

In the Storage Configuration dialog, file types are organized into four categories:

1. **Images** - Image file formats
2. **Documents** - Document and text file formats
3. **Videos** - Video file formats
4. **Audio** - Audio file formats

Each category is displayed in its own section with:
- Category icon
- Category label
- Grid of checkboxes for file extensions
- Visual grouping with background color

## Validation

Both client-side and server-side validation use the same extension list:
- Extensions are normalized to lowercase
- Comparison is case-insensitive
- Validation happens before upload starts (client-side)
- Server-side validation provides a safety check

## Notes

- The `ogg` extension is used for both `video/ogg` and `audio/ogg` MIME types
- Extensions are stored in the database as lowercase strings
- The UI displays extensions in uppercase for better readability

