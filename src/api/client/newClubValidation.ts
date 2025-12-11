"use server"

function codeNewClubIsValid(code: number) {
    if (Number(code) === Number(process.env.codeNewClub)) {
        return true;
    }
    return false;
}

export default codeNewClubIsValid;