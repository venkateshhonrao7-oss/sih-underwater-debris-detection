from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="rehan9599/drishti-sss",
    repo_type="dataset",
    local_dir="../dataset/drishti-sss"
)

print("Dataset download complete.")
