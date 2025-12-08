use diesel::prelude::*;
use salvo::prelude::*;

use crate::{
    ApiError,
    auth::{
        JwtClaims, jwt_decoding_key, jwt_validation,
        session_token::SessionToken,
    },
    db,
    models::Session,
};

pub trait DepotSessionExt {
    #[allow(unused)]
    fn set_session(&mut self, session: crate::models::Session);
    fn get_session(&self) -> Option<&crate::models::Session>;
}

impl DepotSessionExt for Depot {
    fn set_session(&mut self, session: crate::models::Session) {
        self.insert("session", session);
    }

    fn get_session(&self) -> Option<&crate::models::Session> {
        self.get::<crate::models::Session>("session").ok()
    }
}

// to be used without session_hoop
#[handler]
pub async fn access_hoop(
    req: &mut Request,
    depot: &mut Depot,
    res: &mut Response,
    ctrl: &mut FlowCtrl,
) {
    async fn inner(
        req: &mut Request,
        depot: &mut Depot,
    ) -> Result<(), ApiError> {
        let jwt_token = req
            .cookie("access_token")
            .ok_or(ApiError::InvalidAccess)?
            .value();
        // TODO: if expired, try to refresh using refresh token
        let claims: JwtClaims = jsonwebtoken::decode(
            jwt_token,
            jwt_decoding_key(),
            jwt_validation(),
        )
        .map_err(|_| ApiError::InvalidAccess)?
        .claims;

        use crate::schema::sessions::dsl::*;
        let session: Session = sessions
            .filter(expires_at.gt(diesel::dsl::now))
            .filter(id.eq(claims.sid))
            .first(&mut db::get()?)
            .map_err(|_| ApiError::InvalidAccess)?;

        if session.token_hash != claims.jti {
            return Err(ApiError::InvalidAccess);
        }

        depot.set_session(session);
        Ok(())
    }

    if let Err(err) = inner(req, depot).await {
        err.render(res);
        ctrl.skip_rest();
    }
}

#[handler]
pub async fn session_hoop(
    req: &mut Request,
    depot: &mut Depot,
    res: &mut Response,
    ctrl: &mut FlowCtrl,
) {
    async fn inner(
        req: &mut Request,
        depot: &mut Depot,
    ) -> Result<(), ApiError> {
        let session_token = SessionToken::try_from(
            req.cookie("session_token")
                .ok_or(ApiError::InvalidSession)?
                .value(),
        )
        .map_err(|_| ApiError::InvalidSession)?;

        use crate::schema::sessions::dsl::*;
        let session: Session = sessions
            .filter(expires_at.gt(diesel::dsl::now))
            .filter(token_hash.eq(session_token.to_hash()))
            .first(&mut db::get()?)
            .map_err(|_| ApiError::InvalidSession)?;
        depot.set_session(session);
        Ok(())
    }

    if let Err(err) = inner(req, depot).await {
        err.render(res);
        ctrl.skip_rest();
    }
}
