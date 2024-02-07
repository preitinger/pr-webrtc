export default function Page({ params }: { params: { caller: string }}) {
    const caller = decodeURIComponent(params.caller);
    
    return (
        <div>
            <h3>{caller} calling!</h3>
        </div>
    )
}